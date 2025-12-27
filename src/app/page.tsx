"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileJson,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  X,
  Trash2,
  LogOut,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TokenManager } from "@/lib/token-manager";
import { logger } from "@/lib/logger";

interface ConversionHistory {
  id: string;
  fileName: string;
  fileSize: number;
  conversionTime: string;
  rowCount: number;
  columnCount: number;
  status: "success" | "error";
  errorMessage?: string;
  createdAt: string;
}

interface DbConversionHistory {
  id: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  status: string;
  errorMessage?: string | null;
  jsonData?: string | null;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedJson, setConvertedJson] = useState<string>("");
  const [conversionHistory, setConversionHistory] = useState<
    ConversionHistory[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [downloadingHistoryId, setDownloadingHistoryId] = useState<
    string | null
  >(null);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    // Use TokenManager first (more reliable)
    const token = TokenManager.getAccessToken();
    logger.log('TokenManager.getAccessToken():', token ? 'found' : 'not found');

    if (token) {
      const headers = {
        Authorization: `Bearer ${token}`,
      };
      logger.log('Using token from TokenManager:', headers);
      return headers;
    }

    // Fallback to Supabase session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    logger.log('Supabase session:', session ? 'found' : 'not found');

    if (!session?.access_token) {
      logger.log('No token found in TokenManager or Supabase session');
      return {};
    }

    const headers = {
      Authorization: `Bearer ${session.access_token}`,
    };
    logger.log('Using token from Supabase session:', headers);
    return headers;
  };

  // Fetch conversion history on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchConversionHistory();
    }
  }, [user]);

  // Add keyboard shortcut for copying (Ctrl+C or Cmd+C when JSON is available) and removing file (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && convertedJson) {
        e.preventDefault();
        copyJsonToClipboard();
      } else if (e.key === "Escape" && selectedFile) {
        e.preventDefault();
        removeSelectedFile();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [convertedJson, selectedFile]);

  const fetchConversionHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/history", {
        headers,
      });
      if (response.ok) {
        const data: DbConversionHistory[] = await response.json();
        // The API now filters by user_id, so no need to filter on frontend
        const formattedHistory: ConversionHistory[] = data.map((item) => ({
          id: item.id,
          fileName: item.fileName,
          fileSize: item.fileSize,
          conversionTime: new Date(item.createdAt).toLocaleTimeString(),
          rowCount: item.rowCount,
          columnCount: item.columnCount,
          status: item.status as "success" | "error",
          errorMessage: item.errorMessage || undefined,
          createdAt: item.createdAt,
        }));
        setConversionHistory(formattedHistory);
      }
    } catch (error) {
      logger.error("Failed to fetch conversion history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.name.match(/\.(xlsx|xls)$/)) {
          setSelectedFile(file);
        } else {
          toast({
            title: "Invalid file type",
            description: "Please upload an Excel file (.xlsx or .xls)",
            variant: "destructive",
          });
        }
      }
    },
    [toast]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.match(/\.(xlsx|xls)$/)) {
      setSelectedFile(file);
    } else if (file) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
    }
  };

  const handleAreaClick = () => {
    document.getElementById("file-upload")?.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setConvertedJson("");
    // Reset the file input
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
    toast({
      title: "🗑️ File removed",
      description: "Selected file has been removed",
    });
  };

  const convertExcelToJson = async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/convert", {
        method: "POST",
        headers,
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setConvertedJson(JSON.stringify(result.data, null, 2));

        // Refresh history after successful conversion
        await fetchConversionHistory();

        toast({
          title: "Conversion successful!",
          description: `Converted ${result.rowCount} rows with ${result.columnCount} columns`,
        });
      } else {
        // Refresh history after failed conversion
        await fetchConversionHistory();

        toast({
          title: "Conversion failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Refresh history after network error
      await fetchConversionHistory();

      toast({
        title: "Network error",
        description: "Failed to connect to the server",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const downloadJson = () => {
    if (!convertedJson) return;

    const blob = new Blob([convertedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedFile?.name.replace(/\.(xlsx|xls)$/, "")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyJsonToClipboard = async () => {
    if (!convertedJson) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(convertedJson);
      toast({
        title: "✅ Copied to clipboard!",
        description: "JSON content has been copied to your clipboard",
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = convertedJson;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      toast({
        title: "✅ Copied to clipboard!",
        description: "JSON content has been copied to your clipboard",
      });
    } finally {
      // Add a small delay to show the copying state
      setTimeout(() => {
        setIsCopying(false);
      }, 1000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getJsonSize = () => {
    if (!convertedJson) return "0 Bytes";
    return formatFileSize(new Blob([convertedJson]).size);
  };

  const clearHistory = async () => {
    if (conversionHistory.length === 0) return;

    setIsClearingHistory(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/history", {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        setConversionHistory([]);
        toast({
          title: "🗑️ History cleared",
          description: "All conversion history has been deleted",
        });
      } else {
        toast({
          title: "❌ Failed to clear history",
          description: "Could not clear conversion history",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Network error",
        description: "Failed to clear history",
        variant: "destructive",
      });
    } finally {
      setIsClearingHistory(false);
    }
  };

  const downloadHistoryJson = async (historyItem: ConversionHistory) => {
    setDownloadingHistoryId(historyItem.id);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/history/${historyItem.id}`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.jsonData) {
          // Create and download the JSON file
          const blob = new Blob([data.jsonData], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${historyItem.fileName.replace(/\.(xlsx|xls)$/, "")}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast({
            title: "✅ Downloaded!",
            description: `JSON file from ${historyItem.fileName} has been downloaded`,
          });
        } else {
          toast({
            title: "❌ No data available",
            description: "This conversion has no downloadable JSON data",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "❌ Download failed",
          description: "Failed to fetch JSON data from history",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Network error",
        description: "Failed to download JSON file",
        variant: "destructive",
      });
    } finally {
      setDownloadingHistoryId(null);
    }
  };

  const copyHistoryJson = async (historyItem: ConversionHistory) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/history/${historyItem.id}`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.jsonData) {
          // Format JSON nicely before copying
          const formattedJson = JSON.stringify(JSON.parse(data.jsonData), null, 2);
          await navigator.clipboard.writeText(formattedJson);

          toast({
            title: "✅ Copied to clipboard!",
            description: `JSON from ${historyItem.fileName} has been copied`,
          });
        } else {
          toast({
            title: "❌ No data available",
            description: "This conversion has no copyable JSON data",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "❌ Copy failed",
          description: "Failed to fetch JSON data from history",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Fallback for older browsers
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/history/${historyItem.id}`, {
          headers,
        });
        if (response.ok) {
          const data = await response.json();
          if (data.jsonData) {
            const formattedJson = JSON.stringify(JSON.parse(data.jsonData), null, 2);
            const textArea = document.createElement("textarea");
            textArea.value = formattedJson;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);

            toast({
              title: "✅ Copied to clipboard!",
              description: `JSON from ${historyItem.fileName} has been copied`,
            });
          }
        }
      } catch (fallbackError) {
        toast({
          title: "❌ Network error",
          description: "Failed to copy JSON data",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="text-4xl font-bold">Excel to JSON Converter</h1>
              {/* <p className="text-muted-foreground">
              Convert your Excel files to JSON format
            </p> */}
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                {loading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : user && user.email ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Welcome, {user.email}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await signOut();
                        toast({
                          title: "Signed out",
                          description: "You have been signed out successfully",
                        });
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-red-500">
                    Authentication required
                  </div>
                )}
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Tabs defaultValue="converter" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="converter">Converter</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="converter" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Upload Excel File
                  </CardTitle>
                  <CardDescription>
                    Select or drag and drop your Excel file (.xlsx or .xls)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${dragActive
                      ? "border-primary bg-primary/5 scale-[1.02]"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                      }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={handleAreaClick}
                  >
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Drag and drop your Excel file here, or click to browse
                      </p>
                      <Button variant="outline" type="button">
                        Choose File
                      </Button>
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="space-y-3">
                      <Alert className="relative">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-center justify-between pr-8">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4" />
                              <span className="font-medium">
                                {selectedFile.name}
                              </span>
                              <Badge variant="secondary">
                                {formatFileSize(selectedFile.size)}
                              </Badge>
                            </div>
                          </div>
                        </AlertDescription>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={removeSelectedFile}
                              className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove file (Esc)</p>
                          </TooltipContent>
                        </Tooltip>
                      </Alert>

                      <Button
                        onClick={convertExcelToJson}
                        disabled={isConverting}
                        className="w-full"
                      >
                        {isConverting ? "Converting..." : "Convert to JSON"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileJson className="h-5 w-5" />
                    JSON Output
                  </CardTitle>
                  <CardDescription>
                    Your converted JSON data will appear here
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {convertedJson ? (
                    <div className="space-y-3">
                      <ScrollArea className="h-64 w-full border rounded-md p-4">
                        <pre className="text-sm">{convertedJson}</pre>
                      </ScrollArea>
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={copyJsonToClipboard}
                              disabled={isCopying}
                              className="flex-1"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              {isCopying ? "Copying..." : "Copy JSON"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy JSON to clipboard (Ctrl+C)</p>
                          </TooltipContent>
                        </Tooltip>
                        <Button onClick={downloadJson} className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Download JSON
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                      <p className="text-muted-foreground">
                        JSON output will appear here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Conversion History
                    </CardTitle>
                    <CardDescription>
                      View your recent Excel to JSON conversions
                    </CardDescription>
                  </div>
                  {conversionHistory.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearHistory}
                          disabled={isClearingHistory}
                          className="hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                          {isClearingHistory ? "Clearing..." : ""}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear all history</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="h-96 flex items-center justify-center">
                    <p className="text-muted-foreground">
                      Loading conversion history...
                    </p>
                  </div>
                ) : conversionHistory.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {conversionHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{item.fileName}</h4>
                              <Badge
                                variant={
                                  item.status === "success"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {item.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatFileSize(item.fileSize)}</span>
                              <span>{item.conversionTime}</span>
                              {item.status === "success" && (
                                <>
                                  <span>{item.rowCount} rows</span>
                                  <span>{item.columnCount} columns</span>
                                </>
                              )}
                            </div>
                            {item.errorMessage && (
                              <p className="text-sm text-red-600 mt-1">
                                {item.errorMessage}
                              </p>
                            )}
                          </div>
                          {item.status === "success" && (
                            <div className="flex gap-2 ml-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyHistoryJson(item)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy JSON</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadHistoryJson(item)}
                                    disabled={downloadingHistoryId === item.id}
                                  >
                                    <Download className="h-4 w-4" />
                                    {downloadingHistoryId === item.id
                                      ? "Downloading..."
                                      : ""}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Download JSON</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-muted-foreground">
                      No conversion history yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

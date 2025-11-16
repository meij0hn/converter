'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { TokenManager } from '@/lib/token-manager'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        })

        if (error) {
          toast({
            title: "❌ Sign up failed",
            description: error.message,
            variant: "destructive"
          })
        } else {
          // If signup returns a session (auto sign-in), save tokens
          if (data.session) {
            TokenManager.saveAuthData(
              data.session.access_token,
              data.session.refresh_token,
              data.user
            )

            // Also set cookies for middleware
            document.cookie = `access_token=${data.session.access_token}; path=/; max-age=3600; SameSite=Lax`
            document.cookie = `refresh_token=${data.session.refresh_token}; path=/; max-age=3600; SameSite=Lax`

            toast({
              title: "✅ Account created and signed in!",
              description: "Welcome to your new account"
            })

            // Redirect to home page
            router.push('/')
          } else {
            toast({
              title: "✅ Account created!",
              description: "Please check your email to verify your account"
            })
            // Reset form
            setEmail('')
            setPassword('')
            setFullName('')
            setIsSignUp(false)
          }
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) {
          toast({
            title: "❌ Sign in failed",
            description: error.message,
            variant: "destructive"
          })
        } else {
          // Save tokens to localStorage and user data
          if (data.session) {
            TokenManager.saveAuthData(
              data.session.access_token,
              data.session.refresh_token,
              data.user
            )

            // Also set cookies for middleware
            document.cookie = `access_token=${data.session.access_token}; path=/; max-age=3600; SameSite=Lax`
            document.cookie = `refresh_token=${data.session.refresh_token}; path=/; max-age=3600; SameSite=Lax`
          }

          toast({
            title: "✅ Welcome back!",
            description: "Successfully signed in"
          })

          // Redirect immediately since we have the token
          router.push('/')
        }
      }
    } catch (error) {
      toast({
        title: "❌ Authentication error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setIsRedirecting(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Excel to JSON Converter</h1>
        <p className="text-muted-foreground">
          Sign in or create an account to save your conversion history
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Authentication
          </CardTitle>
          <CardDescription>
            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={isSignUp ? "signup" : "signin"} onValueChange={(value) => setIsSignUp(value === "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full w-10"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || isRedirecting}>
                  {isLoading ? 'Signing in...' : isRedirecting ? 'Redirecting...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isSignUp}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={isSignUp}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={isSignUp}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full w-10"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || isRedirecting}>
                  {isLoading ? 'Creating account...' : isRedirecting ? 'Redirecting...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Badge variant="outline" className="mb-2">
              <Lock className="h-3 w-3 mr-1" />
              Secure Authentication
            </Badge>
            <p className="text-sm text-muted-foreground">
              Your data is protected with enterprise-grade security
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
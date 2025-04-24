import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSetRecoilState } from "recoil";
import { loginAtom } from "../atom/loginAtom";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
// import { useToast } from "./ui/use-toast";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  contact: string;
  role: string;
  doctorName: string;
  subRole?: string;
  hospitalDetails?: {
    name: string;
    address: string;
    contact: string;
  };
}

const Login = () => {
  const navigate = useNavigate();
  // const { toast } = useToast();
  const setIsAuthenticated = useSetRecoilState(loginAtom);
  const [tab , setTab] = useState("login");
  const [loginData, setLoginData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState<RegisterCredentials>({
    name: "",
    email: "",
    password: "",
    contact: "",
    role: "CLINIC",
    doctorName: "",
    subRole: "",
    hospitalDetails: {
      name: "",
      address: "",
      contact: "",
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log(API_BASE_URL, " API_BASE_URL);");
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: loginData.email,
        password: loginData.password,
      });

      if (response.data) {
        localStorage.setItem(
          "userData",
          JSON.stringify({
            ...response.data,
            isAuthenticated: true,
          })
        );
        setIsAuthenticated(true);
        toast("Login successful");
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast("Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };
  const onTabChange = (value:any) => {
    setTab(value);
  }
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/register`,
        registerData
      );

      if (response.data) {
        toast("user registered successfully");
        // Reset form
        setRegisterData({
          name: "",
          email: "",
          password: "",
          contact: "",
          role: "CLINIC",
          doctorName: "",
          subRole: "",
          hospitalDetails: {
            name: "",
            address: "",
            contact: "",
          },
        });
        setTab("login"); // Switch to login tab after successful registration
        // setLo
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      const errorMessage =
        error.response?.data?.error ||
        "Please check your details and try again";
      toast(errorMessage)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Welcome to PhysiSync
          </CardTitle>
          <CardDescription className="text-center">
            Manage your clinic efficiently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={onTabChange}   defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-500"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="flex w-[100%] gap-2">
                  <div className="space-y-2 w-[100%]">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your name"
                      required
                      value={registerData.name}
                      onChange={(e) =>
                        setRegisterData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 w-[100%]">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    value={registerData.password}
                    onChange={(e) =>
                      setRegisterData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex w-[100%] gap-2">
                  <div className="space-y-2 w-[100%]">
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      name="contact"
                      type="tel"
                      placeholder="Enter your contact number"
                      required
                      value={registerData.contact}
                      onChange={(e) =>
                        setRegisterData((prev) => ({
                          ...prev,
                          contact: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 w-[100%]">
                    <Label htmlFor="doctorName">Doctor Name</Label>
                    <Input
                      id="doctorName"
                      name="doctorName"
                      type="text"
                      placeholder="Enter doctor's name"
                      required
                      value={registerData.doctorName}
                      onChange={(e) =>
                        setRegisterData((prev) => ({
                          ...prev,
                          doctorName: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2 w-[100%]">
                  <div className="space-y-2 w-[100%]">
                    <Label htmlFor="hospitalName">Hospital Name</Label>
                    <Input
                      id="hospitalName"
                      name="hospitalName"
                      type="text"
                      placeholder="Enter hospital name"
                      required
                      value={registerData.hospitalDetails?.name}
                      onChange={(e) =>
                        setRegisterData((prev) => ({
                          ...prev,
                          hospitalDetails: {
                            ...prev.hospitalDetails!,
                            name: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 w-[100%]">
                    <Label htmlFor="hospitalContact">Hospital Contact</Label>
                    <Input
                      id="hospitalContact"
                      name="hospitalContact"
                      type="tel"
                      placeholder="Enter hospital contact"
                      required
                      value={registerData.hospitalDetails?.contact}
                      onChange={(e) =>
                        setRegisterData((prev) => ({
                          ...prev,
                          hospitalDetails: {
                            ...prev.hospitalDetails!,
                            contact: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2 w-[100%]">
                  <Label htmlFor="hospitalAddress">Hospital Address</Label>
                  <Input
                    id="hospitalAddress"
                    name="hospitalAddress"
                    type="text"
                    placeholder="Enter hospital address"
                    required
                    value={registerData.hospitalDetails?.address}
                    onChange={(e) =>
                      setRegisterData((prev) => ({
                        ...prev,
                        hospitalDetails: {
                          ...prev.hospitalDetails!,
                          address: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-500"
                  disabled={isLoading}
                >
                  {isLoading ? "Registering..." : "Register"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

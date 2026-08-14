import React, { createContext, useContext, useEffect, useState } from "react";
import authService from "../services/auth.service";
import LoginPopup from "../popups/Authentication/Login.popup";
import { useDevice } from "./Device.context";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const deviceId = useDevice();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    let response = await authService.me();

    if (!response.ok) {
      const deviceResponse = await authService.deviceLogin(deviceId);
      if (deviceResponse.ok) {
        const accessToken = deviceResponse.data.accessToken?.replace(
          "Bearer ",
          "",
        );
        if (accessToken) {
          localStorage.setItem("accessToken", accessToken);
        }
        response = await authService.me();
      }
    }

    if (response.ok) {
      setUser(response.data);
    }

    setLoading(false);
  }

  // A user is a "guest" until they link a real account (Google sign-in),
  // which is the only thing that gives them an email.
  const isGuest = !user?.email;

  return (
    <AuthContext.Provider
      value={{ user, setUser, open, setOpen, loading, isGuest }}
    >
      <LoginPopup open={open} setOpen={setOpen} />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
};

import { GoogleOAuthProvider } from "@react-oauth/google";
import { Outlet, Route, Routes } from "react-router";
import { DeviceProvider } from "../contexts/Device.context";
import { AuthProvider } from "../contexts/Auth.context";

export default function RootLayout() {
  return (
    <GoogleOAuthProvider clientId="39363694557-83n8mq8ed8sl8otsjn4if52j2a7qn6ec.apps.googleusercontent.com">
      <DeviceProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </DeviceProvider>
    </GoogleOAuthProvider>
  );
}

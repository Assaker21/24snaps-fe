import { GoogleOAuthProvider } from "@react-oauth/google";
import { Outlet, Route, Routes } from "react-router";
import { DeviceProvider } from "../contexts/Device.context";
import { AuthProvider } from "../contexts/Auth.context";

export default function RootLayout() {
  return (
    <GoogleOAuthProvider clientId="804363128118-vdjnu1ed3arera18bsssr13qbvug4opa.apps.googleusercontent.com">
      <DeviceProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </DeviceProvider>
    </GoogleOAuthProvider>
  );
}

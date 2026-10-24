import { GoogleOAuthProvider } from "@react-oauth/google";
import { Outlet } from "react-router";
import { DeviceProvider } from "../contexts/Device.context";
import { AuthProvider } from "../contexts/Auth.context";

// Note: the language provider is *not* here but around the router itself (App.jsx),
// because /share/:shareId is a sibling route outside this tree and still has to speak
// the visitor's language.
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

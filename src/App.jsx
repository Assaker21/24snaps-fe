import { createBrowserRouter, RouterProvider } from "react-router";
import ErrorLayout from "./layouts/Error.layout";
import MainLayout from "./layouts/Main.layout";
import RootLayout from "./layouts/Root.layout";
import CreateEventPage from "./pages/Main/Events/CreateEvent/CreateEvent.page";
import ManageEventPage from "./pages/Main/Events/ManageEvent/ManageEvent.page";
import EventInvitationPage from "./pages/Main/Events/Invitation/EventInvitation.page";
import LandingPage from "./pages/Main/Landing/Landing.page";
import EventsListPage from "./pages/Main/Events/EventsList/EventsList.page";
import CameraPage from "./pages/Main/Camera/Camera.page";
import AccountPage from "./pages/Main/Account/Account.page";
import ResetPasswordPage from "./pages/Main/ResetPassword/ResetPassword.page";
import SharedAlbumPage from "./pages/Share/SharedAlbum.page";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorLayout />,
    children: [
      {
        path: "/",
        element: <MainLayout />,
        errorElement: <ErrorLayout />,
        children: [
          {
            index: true,
            element: <LandingPage />,
          },
          { path: "account", element: <AccountPage /> },
          // Where the reset password email lands. Inside the app tree on purpose:
          // the visitor is signed out but still gets a guest session, so the top bar
          // and the sign-in popup behave exactly as they do everywhere else.
          { path: "reset-password", element: <ResetPasswordPage /> },
          { path: "events", element: <EventsListPage /> },
          { path: "events/create", element: <CreateEventPage /> },
          {
            path: "events/invitation/:eventId",
            element: <EventInvitationPage />,
          },
          { path: "events/:eventId", element: <ManageEventPage /> },
          { path: "events/:eventId/camera", element: <CameraPage /> },
        ],
      },
    ],
  },
  // Deliberately a sibling of the app rather than a child of it: RootLayout mounts the
  // Google, device and auth providers, and the last of those signs every visitor in as
  // a guest on mount. A shared album has to open for someone who is nobody — no
  // account, no device row, no token — so it hangs outside that tree entirely.
  {
    path: "/share/:shareId",
    element: <SharedAlbumPage />,
    errorElement: <ErrorLayout />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

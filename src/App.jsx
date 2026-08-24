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
]);

export default function App() {
  return <RouterProvider router={router} />;
}

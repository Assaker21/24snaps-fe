import { createBrowserRouter, RouterProvider } from "react-router";
import ErrorLayout from "./layouts/Error.layout";
import MainLayout from "./layouts/Main.layout";
import RootLayout from "./layouts/Root.layout";
import CreateEventPage from "./pages/Main/Events/CreateEvent/CreateEvent.page";
import ManageEventPage from "./pages/Main/Events/ManageEvent/ManageEvent.page";
import LandingPage from "./pages/Main/Landing/Landing.page";
import FilmsPage from "./pages/Main/Films/Films.page";
import CameraPage from "./pages/Main/Camera/Camera.page";

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
          { path: "films", element: <FilmsPage /> },
          { path: "events/create", element: <CreateEventPage /> },
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

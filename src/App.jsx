import { createBrowserRouter, RouterProvider } from "react-router";
import ErrorLayout from "./layouts/Error.layout";
import MainLayout from "./layouts/Main.layout";
import RootLayout from "./layouts/Root.layout";
import CreateEventPage from "./pages/Main/Events/CreateEvent/CreateEvent.page";
import ManageEventPage from "./pages/Main/Events/ManageEvent/ManageEvent.page";
import LandingPage from "./pages/Main/Landing/Landing.page";

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
          { path: "events/create", element: <CreateEventPage /> },
          { path: "events/:eventId", element: <ManageEventPage /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

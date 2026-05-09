import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WelcomePage } from "./pages/WelcomePage";
import { GalleryPage } from "./pages/GalleryPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/:folder" element={<GalleryPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { LandingPage } from "./components/LandingPage";
import { PdfUploadPage } from "./components/PdfUploadPage";
import { Navigation } from "./components/Navigation";

function App() {
  return (
    <BrowserRouter>
      <Box minH="100vh">
        <Navigation />
        <Box py={8}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/upload-pdf" element={<PdfUploadPage />} />
          </Routes>
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App;

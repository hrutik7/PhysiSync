import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { RecoilRoot } from "recoil";
import { Toast } from "./components/ui/toast.tsx";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RecoilRoot>
      <App />
      {/* <Toast /> */}
    </RecoilRoot>
  </StrictMode>
);

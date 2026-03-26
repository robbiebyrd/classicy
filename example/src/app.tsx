import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import { ClassicyDesktop, ClassicyAppManagerProvider } from "classicy";
import Browser from "./apps/browser";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClassicyAppManagerProvider>
      <ClassicyDesktop>
        <Browser />
      </ClassicyDesktop>
    </ClassicyAppManagerProvider>
  </StrictMode>,
);

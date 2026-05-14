"use client";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontFamily: [
      "Roboto",
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "\"Segoe UI\"",
      "Arial",
      "sans-serif"
    ].join(", ")
  },
  shape: {
    borderRadius: 8
  },
  palette: {
    background: {
      default: "#f4f6f8"
    }
  }
});

export default theme;

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import RoutesManager from "./RoutesManager.js";

// Added for AWS Amplify
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';

// This configures Amplify for your entire app when it starts
Amplify.configure(awsExports);
console.log('Amplify Auth config:', Amplify.getConfig().Auth);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <RoutesManager />
  </BrowserRouter>
);
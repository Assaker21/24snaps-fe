import React, { createContext, useContext, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const DeviceContext = createContext(null);

export const DeviceProvider = ({ children }) => {
  const [deviceId] = useState(() => {
    const STORAGE_KEY = "deviceId";
    let storedId = localStorage.getItem("deviceId");

    if (!storedId) {
      storedId = uuidv4();
      localStorage.setItem("deviceId", storedId);
    }

    return storedId;
  });

  return (
    <DeviceContext.Provider value={deviceId}>{children}</DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error("useDevice must be used within a DeviceProvider");
  }
  return context;
};

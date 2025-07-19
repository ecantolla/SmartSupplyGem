"use client"

import type React from "react";

interface NotificationPanelProps {
  warnings: string[];
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ warnings }) => {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-md w-full whitespace-pre-wrap">
      <h3 className="font-bold text-lg mb-2">Notificaciones del Procesamiento:</h3>
      <ul className="list-disc list-inside">
        {warnings.map((warning, index) => (
          <li key={index} className="text-sm">{warning}</li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationPanel;

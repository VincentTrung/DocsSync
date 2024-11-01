import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Home() {
  const location = useLocation();

  return (
    <div className="homepage">
      <h1>Hello {location.state.id} and welcome to DocSync Homepage</h1>
    </div>
  );
}

import "./App.css";
import { v4 as uuidV4 } from "uuid";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import TextEditor from "./components/Docs/TextEditor.jsx";
import Login from "./components/LoginPage/Login.jsx";
import Signup from "./components/LoginPage/Signup.jsx";
import Home from "./components/Homepage/Home.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />

        {/* <Route
          path="/documents"
          element={<Navigate to={`/documents/${uuidV4()}`} />}
        /> */}

        <Route path="/documents/:id" element={<TextEditor />} />
      </Routes>
    </Router>
  );
}

export default App;

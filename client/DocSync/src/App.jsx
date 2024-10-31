import "./App.css";
import { v4 as uuidV4 } from "uuid";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import TextEditor from "./TextEditor";

// Create a document with a unique id
function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact>
          <Redirect to={`/documents/${uuidV4()}`}></Redirect>
        </Route>

        <Route path="/documents/:id" exact>
          <TextEditor />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;

import "./App.css";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact>
          <h1>HELLO WORLD</h1>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;

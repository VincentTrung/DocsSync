import React from "react"
import ModalComponent from "../Components/Modal";
import { GoogleLogin } from "../API/Auth";
import useCheckAuth from "../Hooks/useCheckAuth";
import Doc from "../Components/Doc"

const Docs: React.FC = () => {

  const handleLogin = ()=>{
    GoogleLogin();
  };

  
  let {isAuthenticated, userData} = useCheckAuth();
  console.log(userData);

  return (
  <div className = "doc-container">
    { isAuthenticated ? (
      <>
      <Doc photoURL={userData?.photoURL}/>

    </> 
    ) : (
      <ModalComponent title="Login with Google" handleLogin = {handleLogin}>
      </ModalComponent>  
    )}
  </div>
  );
}

export default Docs;

import React from "react"
import ModalComponent from "../Components/Modal";
import { GoogleLogin } from "../API/Auth";



const Docs: React.FC = () => {
  const handleLogin = ()=>{
    GoogleLogin()
  }
  return <div className = "doc-container">
    <ModalComponent title="Login with Google" handleLogin = {handleLogin}>
      </ModalComponent>
  </div>
}

export default Docs;

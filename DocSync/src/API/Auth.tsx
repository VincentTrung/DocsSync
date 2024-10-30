//import { GoogleAuthProvider } from "firebase/auth/web-extension";
import { auth} from "../firebaseConfig"
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

let provider = new GoogleAuthProvider()

export const GoogleLogin = () => {
  // signInWithPopup(auth, provider).then((response)=>{
  //   const user = response.user;
  //   console.log(user);
  // });
  signInWithPopup(auth, provider);
};
import "./index.scss"
import { MenubarProps } from "../../Interfaces/Menubar"


export default function Menubar({photoURL}: MenubarProps) {
  return (
    <div className="menu-bar">
      <p className="menubar-title">DocSync</p>
        
      <img className="menubar-image" src={photoURL}/>
    </div>
  )
}
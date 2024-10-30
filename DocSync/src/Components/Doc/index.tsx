import React from "react";
import "./index.scss"
import Menubar from "../Menubar"
import { MenubarProps } from "../../Interfaces/Menubar"
import DocCreate from "../DocCreate";


export default function Doc({photoURL}: MenubarProps){
  return <div>
    <Menubar photoURL={photoURL}/>
    <DocCreate/>
  </div>
};
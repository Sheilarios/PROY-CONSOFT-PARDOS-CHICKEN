import { useState } from "react";
import axiosClient from "../api/axiosClient";
import { useNavigate } from "react-router-dom";

export default function Login(){

    const [usuario, setUsuario] = useState("")
    const [contraseña, setContraseña] = useState("")
    const [mensajeError, setMensajeError]=useState("")
    const navegar = useNavigate();

    async function manejarEnvio(evento){
        evento.preventDefault()


        setMensajeError("");

        try{
            const respuesta = await axiosClient.post("token/",{
            username: usuario,
            password: contraseña,
        });

        localStorage.setItem("access_token",respuesta.data.access);
        localStorage.setItem("refresh_token", respuesta.data.refresh);

        navegar("/registrar")
        }catch{
            setMensajeError("No se pudo ingresar. Verifique sus datos o la conexión")
        }
    }


    return (<div>
    <h1>INICIAR SESIÓN</h1>

        <form onSubmit={manejarEnvio}>
            <label htmlFor="usuario">Usuario</label>
            <input id="usuario" type="text" placeholder="coloque su nombre" value={usuario} onChange={(evento)=> setUsuario(evento.target.value)}/>

            <label htmlFor="contra">Contraseña</label>
            <input id="contra" type="password" placeholder="coloque su contraseña" value={contraseña} onChange={(evento)=> setContraseña(evento.target.value)}/>

            <button type="submit">Ingresar</button>
        </form>
        {mensajeError && <p role="alert">{mensajeError}</p>}
        </div>
        )
}
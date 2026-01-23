import Carte from "../components/card";
import { useEffect, useState } from "react";
import axios from "axios";
const Home = () => {
    const [count, setCount] = useState(1)
    const [produits, setProduits] = useState([]); 
    const [error, setError] = useState(null)

    useEffect(() => {
        axios.get("http://192.168.88.240:5000/Amazon")
        .then((response) => {
            setProduits(response.data)
        })
        .catch((err) => {
            setError(err.message);
        });
    }, [])

    const data = [
        {
            id:1,
            image:"/images/c1.jpg",
            nom : "Annah",
            text:"Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat, qui!"
        },
        {
            id:1,
            image:"/images/c2.jpg",
            nom : "Elisa",
            text:"Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat, qui!"
        },
        {
            id:1,
            image:"/images/c3.jpg",
            nom : "Annah Elisa",
            text:"Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat, qui!"
        },
        {
            id:1,
            image:"/images/c4.jpg",
            nom : "Annah Elisa",
            text:"Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat, qui!"
        },
        {
            id:1,
            image:"/images/c2.jpg",
            nom : "Elisa",
            text:"Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat, qui!"
        },
    ]
    const btn = "w-10 text-2xl flex justify-center h-10 items-center border-2 rounded bg-cyan-600 border-b-cyan-700"
    return(
        <div className="bg-sky-50">
            <h1 className="text-3xl">Bienvenue dans la page d'accueil</h1>
            <div className="flex border justify-center-safe center items-center-safe gap-4">
                <button className={btn} onClick={() => {
                    if (count>1){
                        setCount(count - 1)
                    }}}>-</button>
                    <h1>{count}</h1>
                <button className={btn} onClick={() => {
                    if (count<data.length ){
                        setCount(count + 1)
                    }}}>
                        +
                    </button>
            </div>
            <div className="flex flex-wrap">
                {produits.slice(0,count).map((carte)=>(
                    <Carte key={carte.asin} image={carte.image} nom={carte.titre} text={carte.prix}/>
                ))}
            </div>
        </div>
    )
}


export default Home;



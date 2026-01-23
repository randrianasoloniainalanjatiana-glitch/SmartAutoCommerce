
const Carte = (data) =>{
    return(
        <div className="w-1/4 grow p-2">
            <div className=" p-2 shadow rounded-2xl shadow-cyan-900  bg-white">
                <div className="w-full h-90">
                    <img className="w-full h-full object-cover" src={data.image} alt="" />
                </div>
                <div className="">
                    <h2 className="text-2xl">{data.nom}</h2>
                    <p>{data.text}</p>
                </div>
            </div>
        </div>
    )
}
export default Carte;
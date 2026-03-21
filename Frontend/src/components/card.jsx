const Carte = (data) => {
    return (
        <div className="w-1/4 grow p-2">
            <div className="p-2 shadow rounded-2xl shadow-cyan-900/20 dark:shadow-cyan-400/10 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 transition-colors">
                <div className="w-full h-90">
                    <img className="w-full h-full object-cover rounded-xl" src={data.image} alt="" />
                </div>
                <div className="mt-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{data.nom}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{data.text}</p>
                </div>
            </div>
        </div>
    );
};

export default Carte;
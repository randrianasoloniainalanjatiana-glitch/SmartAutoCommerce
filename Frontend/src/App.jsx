import MainLayout from "./components/MainLayout";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import {Amazon, Walmart, AddProduit} from "./pages/Produit";
import ProduitsAmazon from "./components/ProduitAmazon";
import ProduitsWalmart from "./components/ProduitsWalmart";


const App = () =>{
  return(
    <div className="bg-sky-50">
      
      <MainLayout/>
      {/* <Routes>
        <Route path='/Walmart' element={<ProduitsWalmart/>}/>
        <Route path='/Amazon' element={<ProduitsAmazon/>}/>
       
       </Routes> */}
    </div>
  )
}

export default App;
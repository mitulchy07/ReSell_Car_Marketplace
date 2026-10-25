import { RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import './App.css';
import router from './Router/Routes/Routes';

function App() {
  return (
    <div>
      <RouterProvider router={router}></RouterProvider>
      <ToastContainer />
    </div>
  );
}

export default App;

import { createBrowserRouter } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import Main from '../../layout/Main';
import Article from '../../Pages/Blog/Article';
import Blog from '../../Pages/Blog/Blog';
import BrowseCars from '../../Pages/Cars/BrowseCars';
import CarDetail from '../../Pages/Cars/CarDetail';
import CategoryRedirect from '../../Pages/Cars/CategoryRedirect';
import AddItem from '../../Pages/Dashboard/AddItem/AddItem';
import AdminDashboard from '../../Pages/Dashboard/Admin/AdminDashboard';
import AdminUsers from '../../Pages/Dashboard/Admin/AdminUsers';
import DashboardOverview from '../../Pages/Dashboard/DashboardOverview/DashboardOverview';
import MyItems from '../../Pages/Dashboard/MyItems/MyItems';
import BuyerOrders from '../../Pages/Dashboard/MyOrders/MyOrders';
import SellerOrders from '../../Pages/Dashboard/SellerOrders/SellerOrders';
import Faq from '../../Pages/Faq/Faq';
import Home from '../../Pages/Home/Home/Home';
import Login from '../../Pages/Login/Login';
import Register from '../../Pages/Login/Register';
import NoData from '../../Pages/NoData/NoData';
import ProfilePage from '../../Pages/Profile/ProfilePage';
import PrivateRoute from '../PrivateRoute/PrivateRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Main></Main>,
    children: [
      {
        path: '/',
        element: <Home></Home>,
      },

      {
        path: '/admin/users',
        element: (
          <PrivateRoute>
            <AdminUsers />
          </PrivateRoute>
        ),
      },
      { path: '/admin', element: <AdminDashboard /> },

      {
        path: '/profile',
        element: (
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        ),
      },
      { path: '/cars', element: <BrowseCars /> },
      { path: '/cars/:id', element: <CarDetail /> },
      { path: '/blog/:slug', element: <Article /> },
      {
        path: '/blog',
        element: <Blog></Blog>,
      },
      {
        path: '/faq',
        element: <Faq></Faq>,
      },
      {
        path: '/register',
        element: <Register></Register>,
      },
      {
        path: '/login',
        element: <Login></Login>,
      },
      { path: '/category/:category', element: <CategoryRedirect /> },
    ],
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <DashboardLayout></DashboardLayout>
      </PrivateRoute>
    ),
    children: [
      {
        path: '/dashboard/:email',
        element: <DashboardOverview />,
      },
      { path: '/seller/orders', element: <SellerOrders /> },
      {
        path: '/additem',
        element: <AddItem></AddItem>,
      },

      {
        path: '/myitems/:email',
        element: <MyItems />,
      },
      {
        path: '/myorders',
        element: <BuyerOrders />,
      },
    ],
  },
  {
    path: '*',
    element: <NoData></NoData>,
  },
]);

export default router;

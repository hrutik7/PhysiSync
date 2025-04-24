import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect } from "react";
import { useSetRecoilState, useRecoilValue } from "recoil";
import { loginAtom } from "./atom/loginAtom";
import { ToastProvider } from "./components/ui/toast";
import Login from "./components/login";
import Sidebar from "./components/ui/sidebar";
// import Register from "./components/Register";
import Profile from "./components/profile";

import PatientTable from "./components/patienttable";

import SOAPForm from "./components/soap";
import AX from "./components/consultation";
import Custom from "./components/custom";
import Investigation from "./components/investigation";
import Intervention from "./components/intervention";
import Patientlist from "./components/patientlist";
import { Toaster } from "./components/ui/sonner";
import VirtualPatienLlist from "./components/virtualpatientlist";
import MessageScheduler from "./components/message-scheduler";
import Consultation from "./components/consultation";

const App = () => {
  const setIsAuthenticated = useSetRecoilState(loginAtom);
  const isAuthenticated = useRecoilValue(loginAtom);

  useEffect(() => {
    // Check if user is logged in on app load
    const userData = localStorage.getItem("userData");
    if (userData) {
      const { isAuthenticated } = JSON.parse(userData);
      setIsAuthenticated(isAuthenticated);
    }
  }, [setIsAuthenticated]);

  return (
    <ToastProvider>
      <Router>
        {!isAuthenticated ? (
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* <Route path="/register" element={<Register />} /> */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <div className="flex w-full">
            <Sidebar />
            <div className="flex w-[100%]">
            
            <main className="flex-1 bg-gray-50">
              <Routes>
                <Route path="/" element={<Patientlist />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/consent" element={<PatientTable />} />
                {/* <Route path="/timeline" element={ <DailyTimeline />} /> */}
                <Route path="/BOTenable" element={<VirtualPatienLlist />} />
                <Route path="/SOAP" element={<SOAPForm />} />
                <Route path="/consultation" element={<Consultation />} />
                <Route path="/custom" element={<Custom />} />
                <Route path="/investigation" element={<Investigation />} />
                <Route path="/intervention" element={<Intervention />} />
                <Route path="/messages" element={<MessageScheduler />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Toaster />
            </main>
          </div>
          </div>
        )}
      </Router>
    </ToastProvider>
  );
};

export default App;

import { useState } from 'react';
import CitySelectPage from './components/CitySelectPage';
import UploadPage from './components/UploadPage';

const cities = ['Bengaluru', 'Delhi', 'Mumbai', 'Hyderabad'];

function App() {
  const [selectedCity, setSelectedCity] = useState('');
  const [step, setStep] = useState(1);

  const handleContinue = () => {
    if (selectedCity) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  return (
    <div className="app-shell">
      {step === 1 ? (
        <CitySelectPage
          cities={cities}
          selectedCity={selectedCity}
          onSelect={setSelectedCity}
          onContinue={handleContinue}
        />
      ) : (
        <UploadPage
          city={selectedCity}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

export default App;

function CitySelectPage({ cities, selectedCity, onSelect, onContinue }) {
  return (
    <section className="card">
      <p className="eyebrow">Step 1</p>
      <h1>Choose a city to continue</h1>
      <p className="subtext">
        Select the city where you want to consolidate contact data and sync it to your connected sheet.
      </p>

      <label className="field-label" htmlFor="city-select">
        City
      </label>
      <select
        id="city-select"
        value={selectedCity}
        onChange={(event) => onSelect(event.target.value)}
        className="select"
      >
        <option value="">Select a city</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>

      <button className="primary-btn" disabled={!selectedCity} onClick={onContinue}>
        Continue
      </button>
    </section>
  );
}

export default CitySelectPage;

"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in miles
    this.duration = duration; // in min
  }

  _setDescription() {
    //prettier-ignore
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December",];

    this.description = `${this.type.charAt(0).toUpperCase()}${this.type.slice(
      1
    )} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = `running`;

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/mi
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = `cycling`;

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// App Architecture
class App {
  #map;
  #mapEvent;
  workouts = [];

  constructor() {
    //get users geolocation
    this._getPosition();
    //inflate data from localstorage
    this._getLocalStorage();
    //have to use bind as this keyword on eventlistener is by default set to DOM element it fired on
    form.addEventListener(`submit`, this._newWorkout.bind(this));
    //does not fire off instantly like others due to not passing params into callback function
    inputType.addEventListener(`change`, this._toggleElevationField);
    //adding event listener to container as individual workouts may not exist yet
    containerWorkouts.addEventListener(`click`, this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      //this undefined so need to pass to loadmap for variable access
      this._loadMap.bind(this),
      function () {
        alert(`Could not get your location :(`);
      }
    );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    //creating map
    this.#map = L.map(`map`).setView([latitude, longitude], 12);

    L.tileLayer(
      "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: "mapbox/dark-v10",
        tileSize: 512,
        zoomOffset: -1,
        accessToken:
          "pk.eyJ1IjoibWhhc2xpbnNreSIsImEiOiJja3QwcGU1OGowN2RxMnhtaGx2OG85MnNpIn0.htPRpl2e8pHg7FVEx-tBKQ",
      }
    ).addTo(this.#map);
    //handles map clicks, on is leaflets form of eventlistener, so bind needed
    this.#map.on(`click`, this._showForm.bind(this));

    //loading markers here from storage as we have to wait until map is loaded
    this.workouts.forEach((workout) => {
      this._renderMarker(workout);
    });
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove(`hidden`);
    inputDistance.focus();
  }

  _hideForm() {
    //clear inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        ``;

    //so animation is not seen upon form hiding
    form.style.display = `none`;
    form.classList.add(`hidden`);
    setTimeout(() => (form.style.display = `grid`), 200);
  }

  _toggleElevationField() {
    console.log(`toggle`);
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
  }

  _newWorkout(e) {
    //every returns true only if all elements checked returned true
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp) && inp > 0);
    const validElevation = (input) => Number.isFinite(input);
    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    let workout;

    if (type === `running`) {
      const cadence = +inputCadence.value;

      //check valid data
      if (!validInputs(distance, duration, cadence))
        return alert(`Inputs must be positive numbers`);

      let { lat, lng } = this.#mapEvent.latlng;
      workout = new Running([lat, lng], distance, duration, cadence);
      this._renderMarker(workout, type);
    }
    if (type === `cycling`) {
      const elevation = +inputElevation.value;

      if (!validInputs(distance, duration))
        return alert(`Duration and Distance must be positive numbers`);
      if (!validElevation(elevation))
        return alert(`Elevation must be a number`);

      let { lat, lng } = this.#mapEvent.latlng;
      workout = new Cycling([lat, lng], distance, duration, elevation);
      this._renderMarker(workout, type);
    }

    //add workout object to array
    this.workouts.push(workout);

    //render workout on list
    this._renderWorkout(workout, type);
    this._hideForm();

    //set local storage to all workouts
    this._setLocalStorage();
  }
  //render workout map marker
  _renderMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`}${workout.description}`
      )
      .openPopup();
  }

  //creates HTML on left menu displaying workouts
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">mi</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.type === `running`)
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/mi</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>
    `;
    if (workout.type === `cycling`)
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">mi/hr</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>
    `;

    form.insertAdjacentHTML(`afterend`, html);
  }

  _moveToPopup(e) {
    //closest returns itself if node matches case, which it does here
    const workoutEl = e.target.closest(`.workout`);
    console.log(workoutEl);
    //guardian to make sure clicking workout element
    if (!workoutEl) return;
    //finding workout obj in `database` that matches element
    const workout = this.workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    console.log(workout);
    //leaflet tools
    this.#map.setView(workout.coords, 12, {
      animate: true,
      pan: { duration: 2, easeLinearity: 0.2 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem(`workouts`, JSON.stringify(this.workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem(`workouts`));
    if (!data) return;
    this.workouts = data;
    this.workouts.forEach((workout) => {
      this._renderWorkout(workout);
    });
  }

  reset() {
    localStorage.removeItem(`workouts`);
    location.reload();
  }
}

const app = new App();

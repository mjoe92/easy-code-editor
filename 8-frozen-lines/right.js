class Vehicle { // locked
  constructor(make, year) { // locked
    this.make = make;
    this.year = year;
  } // locked

  age() {
    return new Date().getFullYear() - this.year;
  }

  describe() {
    return `${this.make} (${this.year}), ${this.age()} years old`;
  }
} // locked

const v = new Vehicle("Toyota", 2018);
console.log(v.describe()); // locked
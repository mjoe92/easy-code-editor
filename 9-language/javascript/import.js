// Program to find Armstrong number between intervals
const lowNumber = parseInt(prompt('Enter a positive low integer value: '));
const highNumber = parseInt(prompt('Enter a positive high integer value: '));

console.log ('Armstrong Numbers:');

// looping through lowNumber to highNumber
for (let i = lowNumber; i <= highNumber; i++) {

    const numberOfDigits = i.toString().length;

    const sum = 0;
    if (sum + numberOfDigits === i) {
        console.log(i);
    }
}
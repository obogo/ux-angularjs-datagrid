exports.errors = {
    E1001: "",
    E1002: "",
    E1101: "",
    E1102: ""
};
exports.each(exports.errors, function (error, index) {
    exports.errors[index] = index;// for loop to set the code to the code.
});
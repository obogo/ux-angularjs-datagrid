/**
 * **charPack** given a character it will repeat it until the amount specified.
 * example: charPack('0', 3) => '000'
 * @param {String} char
 * @param {Number} amount
 * @returns {string}
 */
function charPack(char, amount) {
    var str = '';
    while (str.length < amount) {
        str += char;
    }
    return str;
}
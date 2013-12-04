function charPack(char, amount) {
    var str = '';
    while (str.length < amount) {
        str += char;
    }
    return str;
}
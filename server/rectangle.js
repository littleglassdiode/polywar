function Rectangle(jsonRect) {
    this.position = jsonRect.position;
    this.size = jsonRect.size;
    this.color = jsonRect.color;
}

Rectangle.prototype.contains = function(point) {
    return (point[0] <= this.position[0] + this.size[0]) &&
           (point[1] <= this.position[1] + this.size[1]) &&
           (point[0] >= this.position[0] - this.size[0]) &&
           (point[1] >= this.position[1] - this.size[1]);
}

exports.Rectangle = Rectangle;

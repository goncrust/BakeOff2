// Target class (position and width)
class Target {
  constructor(x, y, w, l, il) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.label = l;
    this.isLetter = il;
  }

  // Checks if a mouse click took place
  // within the target
  clicked(mouse_x, mouse_y) {
    return dist(this.x, this.y, mouse_x, mouse_y) < this.width / 2;
  }

  // Draws the target (i.e., a circle) and its label
  draw() {
    // Draw target
    fill(color(255, 255, 255));
    circle(this.x, this.y, this.width);

    // Draw label
    textFont("Arial", this.isLetter ? 40 : 15);
    fill(color(0, 0, 0));
    textAlign(CENTER);
    text(this.label, this.x, this.isLetter ? this.y + 10 : this.y);
  }
}

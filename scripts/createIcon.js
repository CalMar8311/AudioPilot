import fs from 'fs';
import path from 'path';

// Minimal valid 128x128 PNG image buffer
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAAD+mAutomation0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAADh0RVh0U29mdHdhcmUARGVmYXVsdCBnaW1wLWltYWdlLW1hcHBlciB2ZXJzaW9uIDEuMiBieSBNYXJjIExlbWtlT9i3XgAAAA1JREFUeJztwTEBAAAACipve5U1g8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG8G+8AAAat40cAAAAABJRU5ErkJggg==';

const buffer = Buffer.from(base64Png, 'base64');
fs.writeFileSync(path.join(process.cwd(), 'public/icon.png'), buffer);
console.log('Created public/icon.png');
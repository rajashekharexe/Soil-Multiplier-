from PIL import Image

def fix_image(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size
        pixels = img.load()
        
        # The white bar is at the bottom.
        # Let's just find the bottom-most non-white pixel and crop anything below it!
        # Or better yet, just replace ANY pure white pixel near the bottom with transparent.
        
        def color_diff(c1, c2):
            return sum(abs(a - b) for a, b in zip(c1[:3], c2[:3]))
            
        # Scan from bottom up. If a row is entirely white/transparent, crop it.
        bottom_crop = height
        for y in range(height-1, -1, -1):
            is_empty_row = True
            for x in range(width):
                r, g, b, a = pixels[x, y]
                # If pixel is not transparent and not white
                if a > 0 and color_diff((r,g,b), (255,255,255)) > 30:
                    is_empty_row = False
                    break
            if not is_empty_row:
                bottom_crop = y + 1 # Keep this row and above
                break
                
        print(f"Original height: {height}, Cropping at bottom to: {bottom_crop}")
        
        if bottom_crop < height:
            img = img.crop((0, 0, width, bottom_crop))
            img.save(output_path, "PNG")
            print("Cropped successfully!")
        else:
            print("No white bar found at bottom.")
            
    except Exception as e:
        print(f"Error: {e}")

fix_image("public/kad-multiplier-transparent.png", "public/kad-multiplier-transparent.png")

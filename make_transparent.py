from PIL import Image

def process_logo(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        # item is (R, G, B, A)
        # Keep original Alpha, set RGB to white (255, 255, 255)
        new_data.append((255, 255, 255, item[3]))
            
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Saved processed logo to {output_path}")

if __name__ == "__main__":
    process_logo("images/logo_new.png", "images/logo_transparent_white.png")

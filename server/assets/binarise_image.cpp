#include <opencv4/opencv2/opencv.hpp>
#include <iostream>

using namespace cv;

int main(int argc, char** argv)
{
    if (argc < 2){
        printf("Usage: ./binarise <img_path>\n");
        return -1;
    }


    Mat img = imread(argv[1], IMREAD_GRAYSCALE);
    Mat img_out;

    std::cout << img;

    threshold(img, img_out, 125, 255, THRESH_BINARY);

    if (!imwrite("map_col.bmp", img_out))
    {
        printf("Failed to save image as %s\n", argv[1]);
        return -1;
    }
}
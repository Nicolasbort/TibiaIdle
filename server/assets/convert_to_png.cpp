#include <opencv4/opencv2/opencv.hpp>


using namespace cv;

int main(int argc, char** argv)
{
    if (argc < 2){
        printf("Usage: ./convert <img_path>\n");
        return -1;
    }


    Mat img = imread(argv[1], IMREAD_GRAYSCALE);

    if (!imwrite("output.png", img))
    {
        printf("Failed to save image as %s\n", argv[1]);
        return -1;
    }
}
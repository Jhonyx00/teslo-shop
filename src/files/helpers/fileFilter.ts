export const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callBack: Function,
) => {
  if (!file) return callBack(new Error('File is empty'), false); //no file included

  const fileExtension = file.mimetype.split('/')[1];
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];

  if (validExtensions.includes(fileExtension)) {
    return callBack(null, true); //file included and acepted
  }

  //console.log({ file });
  callBack(null, false); //file not acepted if false
};

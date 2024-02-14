const getSignedUrl = async ({ filePath, operation, expiry }) => {
	const nonPrefixedFilePath = StorageActions.getNonPrefixedFilePath(filePath);
	const signedUrl = await StorageActions.getSignedUrl(
		operation,
		'private',
		null,
		nonPrefixedFilePath,
		expiry
	);
	return signedUrl;
};

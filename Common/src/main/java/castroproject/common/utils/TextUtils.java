package castroproject.common.utils;

import net.kyori.adventure.text.Component;

public class TextUtils
{
	public static String getTextFromComponent(Component component)
	{
		return component.toString().split("content=\"")[1].split("\", style=")[0];
	}
}
